/**
 *
 * @param {*} loaderAbsPath loader的绝对路径
 */
function createLoaderObject(loaderAbsPath) {
  const normal = require(loaderAbsPath);
  const pitch = normal.pitch;
  // 如果设置raw为true的话，那么loader的normal函数的参数就是一个buffer，否则是一个字符串
  const raw = normal.raw;
  return {
    path: loaderAbsPath,
    normal,
    pitch,
    raw,
    // 每个loader都有一个自己的自定义对象，可以用来保存和传递数据
    data: {},
    // 表示此loader的normal和pitch是否执行过
    pitchExecuted: false,
    normalExecuted: false,
  };
}

/**
 * 转换loader的参数
 * @param {*} args 包含读取了的资源
 * @param {*} raw loader想要buffer还是字符串
 */
function convertArgs(args, raw) {
  if (raw && !Buffer.isBuffer(args[0])) {
    args[0] = Buffer.from(args[0]);
  } else if (!raw && Buffer.isBuffer(args[0])) {
    args[0] = args[0].toString();
  }
}

function runSyncOrAsync(fn, loaderContext, args, runCallback) {
  // 默认情况下是同步的
  let isSync = true;
  // 表示当前的函数是否执行完毕
  let isDone = false;
  // 调用会执行下一个loader
  loaderContext.callback = (err, ...args) => {
    if (isDone) {
      throw new Error("已经调用过了");
    }
    runCallback(err, ...args);
  };
  // 调用后会变为异步
  loaderContext.async = () => {
    isSync = false;
    return loaderContext.callback;
  };

  let result = fn.apply(loaderContext, args);
  // 同步情况下执行完后直接执行下一个Loader，异步需要手动调用callback
  if (isSync) {
    // 同步的话第二个参数只有一个result，异步的话可以传多个
    runCallback(null, result);
    isDone = true;
  }
}

function iterateNormalLoaders(
  processOptions,
  loaderContext,
  args,
  pitchingCallback
) {
  // 越界处理
  if (loaderContext.loaderIndex < 0) {
    return pitchingCallback(null, args);
  }

  let currentLoader = loaderContext.loaders[loaderContext.loaderIndex];

  if (currentLoader.normalExecuted) {
    loaderContext.loaderIndex--;
    return iterateNormalLoaders(
      processOptions,
      loaderContext,
      args,
      pitchingCallback
    );
  }

  let fn = currentLoader.normal;
  currentLoader.normalExecuted = true;
  convertArgs(args, currentLoader.raw);
  // 要以同步或者异步的方式执行fn
  runSyncOrAsync(fn, loaderContext, args, (err, ...returnArgs) => {
    if (err) {
      pitchingCallback(err);
    }
    return iterateNormalLoaders(
      processOptions,
      loaderContext,
      returnArgs,
      pitchingCallback
    );
  });
}

// 读取文件
function processResource(processOptions, loaderContext, pitchingCallback) {
  processOptions.readResource(loaderContext.resource, (err, resourceBuffer) => {
    processOptions.resourceBuffer = resourceBuffer;
    // 处理完pitch后指针越界
    loaderContext.loaderIndex--;
    iterateNormalLoaders(
      processOptions,
      loaderContext,
      [resourceBuffer],
      pitchingCallback
    );
  });
}

function iteratePitchingLoaders(
  processOptions,
  loaderContext,
  pitchingCallback
) {
  // index越界表示pitch已经执行完毕
  if (loaderContext.loaderIndex >= loaderContext.loaders.length) {
    return processResource(processOptions, loaderContext, pitchingCallback);
  }

  let currentLoader = loaderContext.loaders[loaderContext.loaderIndex];

  // 每次递归currentLoader会走两次，第一次执行pitch，第二次判断是否执行, 防止重复执行
  if (currentLoader.pitchExecuted) {
    loaderContext.loaderIndex++;
    return iteratePitchingLoaders(
      processOptions,
      loaderContext,
      pitchingCallback
    );
  }

  let fn = currentLoader.pitch;
  currentLoader.pitchExecuted = true;

  if (!fn) {
    return iteratePitchingLoaders(
      processOptions,
      loaderContext,
      pitchingCallback
    );
  }
  runSyncOrAsync(
    fn,
    loaderContext,
    [
      loaderContext.remainingRequest,
      loaderContext.previousRequest,
      loaderContext.data,
    ],
    (err, ...returnArgs) => {
      if (err) {
        return pitchingCallback(err);
      }
      // 判断pitch方法是否有返回值，有的话跳过后面的loader，执行前一个loader的normal
      if (returnArgs.length > 0 && returnArgs.some((item) => item)) {
        loaderContext.loaderIndex--;
        iterateNormalLoaders(
          processOptions,
          loaderContext,
          args,
          pitchingCallback
        );
      } else {
        return iteratePitchingLoaders(
          processOptions,
          loaderContext,
          pitchingCallback
        );
      }
    }
  );
}

function runLoaders(options, finalCallback) {
  /**
   * resource 要处理的资源，即要编译的模块路径
   * loaders，处理此路径的loaders
   * context 上下文对象
   * readResource 读取资源的方法，默认是fs.readFile
   */
  const { resource, loaders = [], context = {}, readResource } = options;
  // loaders是loader模块绝对路径的数组，将绝对路径转换为对象
  const loaderObjects = loaders.map(createLoaderObject);
  // 这个就是loader执行时的this指针
  const loaderContext = context;
  loaderContext.resource = resource;
  loaderContext.readResource = readResource;
  loaderContext.loaders = loaderObjects;
  // 当前正在处理的loader的索引
  loaderContext.loaderIndex = 0;
  // 可以手动调用此方法向后执行下一个loader
  loaderContext.callback = null;
  // 可以将Loader的运行从同步变为异步，并返回this.callback
  loaderContext.async = null;
  // request代表整个请求
  Object.defineProperty(loaderContext, "request", {
    get() {
      // 把loader的绝对路径和要加载的资源的绝对路径用!拼接在一起
      return loaderContext.loaders
        .map((loader) => loader.path)
        .concat(loaderContext.resource)
        .join("!");
    },
  });

  Object.defineProperty(loaderContext, "remainingRequest", {
    get() {
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex + 1)
        .map((loader) => loader.path)
        .concat(loaderContext.source)
        .join("!");
    },
  });

  Object.defineProperty(loaderContext, "currentRequest", {
    get() {
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex)
        .map((loader) => loader.path)
        .concat(loaderContext.source)
        .join("!");
    },
  });

  Object.defineProperty(loaderContext, "previousRequest", {
    get() {
      return loaderContext.loaders
        .slice(0, loaderContext.loaderIndex)
        .map((loader) => loader.path)
        .join("!");
    },
  });

  Object.defineProperty(loaderContext, "data", {
    get() {
      return loaderContext.loaders[loaderContext.loaderIndex].data;
    },
  });

  const processOptions = {
    // fs.readFile
    readResource,
    // 要读取的资源的源代码,是一个buffer
    resourceBuffer: null,
  };

  iteratePitchingLoaders(processOptions, loaderContext, (err, result) => {
    finalCallback(err, {
      // 是最终的结果，最左侧Loader的normal函数返回的结果
      result,
      resourceBuffer: processOptions.resourceBuffer,
    });
  });
}

exports.runLoaders = runLoaders;
