/* eslint-disable no-console */
"use strict";
const klawSync = require("klaw-sync");
const path = require("path");
const fs = require("fs");
const javaParser = require("../src/index");

const options = {
  failFast: false,
  printProgress: false,
  printErrors: true
};

let printProgress = () => {};
let printErrors = () => {};
if (options.printProgress) {
  printProgress = console.log;
}

if (options.printErrors) {
  printErrors = console.error;
}

// const samplesDir = path.resolve(__dirname, "../samples/java-design-patterns");
const samplesDir = path.resolve(__dirname, "../samples/spring-boot");
const sampleFiles = klawSync(samplesDir, { nodir: true });
const javaSampleFiles = sampleFiles.filter(fileDesc =>
  fileDesc.path.endsWith(".java")
);

const javaPathAndText = javaSampleFiles.map(fileDesc => {
  const currJavaFileString = fs.readFileSync(fileDesc.path, "utf8");
  const relativePath = path.relative(__dirname, fileDesc.path);

  return { path: relativePath, text: currJavaFileString };
});

let success = 0;
let failed = 0;

const fullStartTime = new Date().getTime();
javaPathAndText.forEach(fileDesc => {
  // TODO: read the files BEFORE the benchmark started to only bench the parsing speed...
  const relativePath = fileDesc.path;
  try {
    const sampleStartTime = Date.now();
    javaParser.parse(fileDesc.text);
    const sampleEndTime = Date.now();
    const totalSampleTime = sampleEndTime - sampleStartTime;
    printProgress(
      `Success parsing: <${relativePath}> - <${totalSampleTime}ms>`
    );

    success++;
  } catch (e) {
    printErrors(`Failed parsing: <${relativePath}>`);
    if (options.failFast) {
      throw e;
    }
    failed++;
    printErrors(e.message);
  }
});
const fullEndTime = new Date().getTime();
const fullTotalTime = fullEndTime - fullStartTime;

const totalFiles = success + failed;
const successPercentage = ((success / totalFiles) * 100).toFixed(3);

console.log(`Total number of files: <${totalFiles}>`);
console.warn(`Total number of failures: <${failed}>`);
console.log(`Total time: <${fullTotalTime}ms>`);
console.log(`Success Percentage: ${successPercentage}%`);
