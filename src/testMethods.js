import * as kernel from 'libkernel';

// TestLibkernelInit will check the init function of libkernel. This tests that
// the bridge script was loaded. If this fails, it either means the browser
// extension is missing entirely or it means that something fundamental broke.
function TestLibkernelInit() {
  return kernel.init();
}

// TestSendTestMessage will send a test message to the kernel and check for the
// result. If this fails it probably means the kernel failed to load for some
// reason, though it could also mean that the page->bridge->background->kernel
// communication path is broken in some way.
function TestSendTestMessage() {
  return kernel.testMessage();
}

// TestModuleHasSeed checks that the test module was given a seed by the
// kernel. This is one of the fundamental priveledges of being a kernel module:
// receiving a secure and unique seed for module-specific user data.
//
// The full message flow here is:
// 	webpage => bridge => background =>
// 		kernel => test module ->
// 		kernel ->
// 	background -> bridge -> webpage
let kernelTestSuite = 'AQCPJ9WRzMpKQHIsPo8no3XJpUydcDCjw7VJy8lG1MCZ3g';
function TestModuleHasSeed() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'viewSeed', {})
      .then((data) => {
        if (!('seed' in data)) {
          reject('viewSeed in test module did not return a data.seed');
          return;
        }
        console.log(data);
        if (data.seed.length !== 16) {
          reject(
            'viewSeed in test module returned a seed with a non-standard length'
          );
          return;
        }
        resolve('viewSeed appears to have returned a standard seed');
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestModuleLogging checks that the test suite module is capable of logging.
// This test requires looking in the console of the kernel to see that the log
// was printed correctly.
function TestModuleLogging() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'testLogging', {})
      .then((data) => {
        resolve('test module has produced logs');
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestMissingModule checks that the kernel correctly handles a call to a
// module that doesn't exist. For the module, we use the test module but with
// the final character modified so that the hash doesn't actually point to
// anything.
let moduleDoesNotExist = 'AQCPJ9WRzMpKQHIsPo9no3XJpUydcDCjw7VJy8lG1MCZ3g';
function TestMissingModule() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(moduleDoesNotExist, 'viewSeed', {})
      .then((data) => {
        reject('kernel is supposed to return an error:' + JSON.stringify(data));
      })
      .catch((err) => {
        resolve(err);
      });
  });
}

// TestMalformedModule checks that the kernel correctly handles a call to a
// module that is using a malformed skylink.
let moduleMalformed = 'AQCPJ9WRzMpKQHIsPo8no3XJpUydcDCjw7VJy8lG1MCZ3';
function TestMalformedModule() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(moduleMalformed, 'viewSeed', {})
      .then((data) => {
        reject('kernel is supposed to return an error');
      })
      .catch((err) => {
        resolve(err);
      });
  });
}

// TestModulePresentSeed attempts to send a 'presentSeed' method to the test
// module. This is expected to fail because the kernel is not supposed to allow
// external callers to use the 'presentSeed' method. If it succeeds, the test
// module will log an error that TestModuleHasErrors will catch.
function TestModulePresentSeed() {
  return new Promise((resolve, reject) => {
    let fakeSeed = new Uint8Array(16);
    kernel
      .callModule(kernelTestSuite, 'presentSeed', {
        seed: fakeSeed,
      })
      .then((data) => {
        // The reject and resolve get flipped because we want
        // to trigger an error.
        reject('expecting an error for using a forbidden method');
      })
      .catch((err) => {
        // The reject and resolve get flipped because we want
        // to trigger an error.
        resolve('received expected error: ' + err);
      });
  });
}

// TestModuleQueryKernel opens a query with the test module that has the test
// module send a test query to the kernel, and then the test module reports the
// kernel version back to us. This test confirms that modules are able to talk
// to the kernel.
//
// The full message flow here is:
// 	webpage => bridge => background =>
// 		kernel => test module =>
// 			kernel -> test module ->
// 		kernel ->
// 	background -> bridge -> webpage
function TestModuleQueryKernel() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'sendTestToKernel', {})
      .then((data) => {
        if (!('kernelVersion' in data)) {
          reject('expecting response to have a kernelVersion');
          return;
        }
        resolve(data.kernelVersion);
      })
      .catch((err) => {
        reject('callModule failed: ' + err);
      });
  });
}

// TestModuleCheckHelperSeed opens a query with the test module to have the
// test module check the seed of the helper module.
//
// The full message flow here is:
// 	webpage => bridge => background =>
// 		kernel => test module =>
// 			kernel => helper module ->
// 		kernel -> test module ->
// 	kernel -> background -> bridge -> webpage
function TestModuleCheckHelperSeed() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'viewHelperSeed', {})
      .then((data) => {
        if (!('message' in data)) {
          reject('expecting response to have a kernelVersion');
          return;
        }
        resolve(data.message);
      })
      .catch((err) => {
        reject('callModule failed: ' + err);
      });
  });
}

// TestViewTesterSeedByHelper has the test module as the helper module to fetch
// the seed of the test module. This test ensures that multi-hop module
// communication works.
//
// The full message flow here is:
// 	webpage => bridge => background =>
// 		kernel => test module =>
// 			kernel => helper module =>
// 				kernel => test module ->
// 			kernel -> helper module ->
// 		kernel -> test module ->
// 	kernel -> background -> bridge -> webpage
function TestViewTesterSeedByHelper() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'viewOwnSeedThroughHelper', {})
      .then((data) => {
        if (!('message' in data)) {
          reject('expecting response to have a kernelVersion');
          return;
        }
        resolve(data.message);
      })
      .catch((err) => {
        reject('callModule failed: ' + err);
      });
  });
}

// Check that the kernel is assigning the correct domain to the webpage.
function TestMirrorDomain() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'mirrorDomain', {})
      .then((data) => {
        if (!('domain' in data)) {
          reject('mirrorDomain did not return a domain');
          return;
        }
        if (typeof data.domain !== 'string') {
          reject('mirrorDomain returned wrong type: ' + typeof data.domain);
          return;
        }
        if (data.domain !== window.location.hostname) {
          reject(
            'wrong domain\nexpected: ' +
              window.location.hostname +
              '\ngot: ' +
              data.domain
          );
          return;
        }
        resolve('got expected domain: ' + data.domain);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// Check that the kernel is assigning the correct domain to other modules.
// function TestTesterMirrorDomain() {
//   return new Promise((resolve, reject) => {
//     kernel
//       .callModule(kernelTestSuite, 'testerMirrorDomain', {})
//       .then((data) => {
//         if (!('domain' in data)) {
//           reject('testerMirrorDomain did not return a domain');
//           return;
//         }
//         if (typeof data.domain !== 'string') {
//           reject(
//             'testerMirrorDomain returned wrong type: ' + typeof data.domain
//           );
//           return;
//         }
//         if (data.domain !== kernelTestSuite) {
//           reject(
//             'wrong domain\nexpected: ' +
//               kernelTestSuite +
//               '\ngot: ' +
//               data.domain
//           );
//           return;
//         }
//         resolve('got expected domain: ' + data.domain);
//       })
//       .catch((err) => {
//         reject(err);
//       });
//   });
// }

// Check that the kernel is rejecting moduleCall messages that don't include a
// method field.
function TestMethodFieldRequired() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, null, {})
      .then((data) => {
        reject('expecting a call to the kernel with no method to fail');
      })
      .catch((err) => {
        resolve('kernel failed when there was a call with no method: ' + err);
      });
  });
}

// TestResponseUpdates checks that modules can successfully send responseUpdate
// messages.
function TestResponseUpdates() {
  return new Promise((resolve, reject) => {
    let progress = 0;
    let receiveUpdate = function (data) {
      if (!('eventProgress' in data)) {
        reject('eventProgress not provided in response');
        return;
      }
      if (data.eventProgress !== progress + 25) {
        // NOTE: event ordering is not actually guaranteed by the spec, but
        // this is a situation where parallelism is low enough that the
        // ordering should be okay.
        reject('progress messages appear to be arriving out of order');
        return;
      }
      progress += 25;
    };
    let [, query] = kernel.connectModule(
      kernelTestSuite,
      'testResponseUpdate',
      {},
      receiveUpdate
    );
    query
      .then((data) => {
        if (progress !== 75) {
          reject('response was received before responseUpdates were completed');
          console.log('progress is:', progress);
          return;
        }
        if (!('eventProgress' in data)) {
          reject('expecting response to contain eventProgress');
          return;
        }
        if (data.eventProgress !== 100) {
          reject('expecting response eventProgress to be 100');
          return;
        }
        resolve(
          'received all messages in order and final message was a response'
        );
      })
      .catch((err) => {
        reject(kernel.addContextToErr(err, 'testResponseUpdate failed'));
      });
  });
}

// TestModuleUpdateQuery checks that modules can successfully send queryUpdate
// and responseUpdate messages.
function TestModuleUpdateQuery() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'updateTest', {})
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestIgnoreResponseUpdates checks that you can safely use callModule on a
// module method that provides response updates.
function TestIgnoreResponseUpdates() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'testResponseUpdate', {})
      .then((data) => {
        if (!('eventProgress' in data)) {
          reject('expecting response to contain eventProgress');
          return;
        }
        if (data.eventProgress !== 100) {
          reject('expecting response eventProgress to be 100');
          return;
        }
        resolve(
          'received final message when calling testResponseUpdate using callModule'
        );
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestBasicCORS has the test module make a fetch request to a couple of
// websites to check that CORS is not preventing workers from talking to the
// network.
function TestBasicCORS() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'testCORS', {})
      .then((data) => {
        if (!('url' in data)) {
          reject('testCORS did not return a url');
          return;
        }
        if (typeof data.url !== 'string') {
          reject('testCORS returned wrong type: ' + typeof data.domain);
          return;
        }
        resolve('CORS test passed for url: ' + data.url);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestSecureUploadAndDownload will upload a very basic file to Skynet using
// libkernel. It will then download that skylink using libkernel.
function TestSecureUploadAndDownload() {
  return new Promise((resolve, reject) => {
    let fileDataUp = new TextEncoder().encode('test data');
    kernel
      .upload('testUpload.txt', fileDataUp)
      .then((skylink) => {
        kernel
          .download(skylink)
          .then((fileDataDown) => {
            if (fileDataUp.length !== fileDataDown.length) {
              reject(
                'uploaded data and downloaded data do not match: ' +
                  JSON.stringify({
                    uploaded: fileDataUp,
                    downloaded: fileDataDown,
                  })
              );
              return;
            }
            for (let i = 0; i < fileDataUp.length; i++) {
              if (fileDataUp[i] !== fileDataDown[i]) {
                reject(
                  'uploaded data and downloaded data do not match: ' +
                    JSON.stringify({
                      uploaded: fileDataUp,
                      downloaded: fileDataDown,
                    })
                );
                return;
              }
            }
            resolve(skylink);
          })
          .catch((err) => {
            reject(err);
          });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestMsgSpeedSequential5k will send ten thousand messages to the kernel
// sequentially.
function TestMsgSpeedSequential5k() {
  // sendSequentialMessages is a helper function that will send a
  // message, wait for the message to resolve, then call itself again
  // with a lower 'remaining' value, exiting out when 'remaining' hits
  // zero.
  let sendSequentialMessages = function (remaining, resolve, reject) {
    if (remaining === 0) {
      resolve('all messages resolved');
      return;
    }

    kernel
      .testMessage()
      .then((x) => {
        sendSequentialMessages(remaining - 1, resolve, reject);
      })
      .catch((x) => {
        reject(x);
      });
  };
  return new Promise((resolve, reject) => {
    sendSequentialMessages(5000, resolve, reject);
  });
}

// TestModuleSpeedSequential5k will have the tester module perform five
// thousand sequential messages on the helper module.
function TestModuleSpeedSequential20k() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'callModulePerformanceSequential', {
        iterations: 20000,
      })
      .then((data) => {
        resolve('sequential messages succeeded');
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestMsgSpeedParallel5k will send ten thousand messages to the kernel in
// parallel.
// function TestMsgSpeedParallel5k() {
//   return new Promise((resolve, reject) => {
//     let promises = [];
//     for (let i = 0; i < 5000; i++) {
//       promises.push(kernel.testMessage());
//     }
//     Promise.all(promises)
//       .then((x) => {
//         resolve('all messages reseolved');
//       })
//       .catch((x) => {
//         reject(x);
//       });
//   });
// }

// TestModuleSpeedParallel5k will have the tester module perform five
// thousand sequential messages on the helper module.
function TestModuleSpeedParallel20k() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'callModulePerformanceParallel', {
        iterations: 20000,
      })
      .then((data) => {
        resolve('sequential messages succeeded');
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// TestModuleHasErrors asks the TestModule whether it has encountered any
// errors during the test cycle.
function TestModuleHasErrors() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(kernelTestSuite, 'viewErrors', {})
      .then((data) => {
        if (!('errors' in data)) {
          reject('viewErrors in test module did not return a data.errors');
          return;
        }
        if (data.errors.length !== 0) {
          reject(
            'test module has acculumated errors: ' + JSON.stringify(data.errors)
          );
          return;
        }
        resolve('test module did not accumulate any errors');
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// Check whether any errors showed up in the helper module of the testing
// module.
let helperModule = 'AQCoaLP6JexdZshDDZRQaIwN3B7DqFjlY7byMikR7u1IEA';
function TestHelperModuleHasErrors() {
  return new Promise((resolve, reject) => {
    kernel
      .callModule(helperModule, 'viewErrors', {})
      .then((data) => {
        if (!('errors' in data)) {
          reject('viewErrors in helper module did not return a data.errors');
          return;
        }
        if (data.errors.length !== 0) {
          reject(
            'helper module has acculumated errors: ' +
              JSON.stringify(data.errors)
          );
          return;
        }
        resolve('helper module did not accumulate any errors');
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export const testCardValues = [
  { name: 'TestLibkernelInit', test: TestLibkernelInit },
  { name: 'TestSendTestMessage', test: TestSendTestMessage },
  { name: 'TestModuleHasSeed', test: TestModuleHasSeed },
  { name: 'TestModuleLogging', test: TestModuleLogging },
  { name: 'TestModuleMissingModule', test: TestMissingModule },
  { name: 'TestModuleMalformedModule', test: TestMalformedModule },
  { name: 'TestModulePresentSeed', test: TestModulePresentSeed },
  { name: 'TestModuleQueryKernel', test: TestModuleQueryKernel },
  { name: 'TestModuleCheckHelperSeed', test: TestModuleCheckHelperSeed },
  { name: 'TestViewTesterSeedByHelper', test: TestViewTesterSeedByHelper },
  { name: 'TestMirrorDomain', test: TestMirrorDomain },
  { name: 'TestMethodFieldRequired', test: TestMethodFieldRequired },
  { name: 'TestResponseUpdates', test: TestResponseUpdates },
  { name: 'TestModuleUpdateQuery', test: TestModuleUpdateQuery },
  { name: 'TestIgnoreResponseUpdates', test: TestIgnoreResponseUpdates },
  { name: 'TestBasicCORS', test: TestBasicCORS },
  { name: 'TestSecureUploadAndDownload', test: TestSecureUploadAndDownload },
  { name: 'TestMsgSpeedSequential5k', test: TestMsgSpeedSequential5k },
  { name: 'TestModuleSpeedSeq20k', test: TestModuleSpeedSequential20k },
  { name: 'TestModuleSpeedParallel20k', test: TestModuleSpeedParallel20k },
  { name: 'TestModuleHasErrors', test: TestModuleHasErrors },
  { name: 'TestHelperModuleHasErrors', test: TestHelperModuleHasErrors },
];
