var fs = require('fs');
var path = require('path');
var compiler = require('solc');

var tokenBytecode = undefined;
var tokenABI = undefined;

function compilerInput (files) {
  var result = {
    language: 'Solidity',
    sources: {
    },
    settings: {
      outputSelection: {
        '*': {
          '': [ 'legacyAST' ],
          '*': [ '*' ]
        }
      }
    }
  }

  files.map(function(fileInfo, i) {
    result.sources[fileInfo.name] = {content: fileInfo.sourceCode};
  });
  return JSON.stringify(result);
}

function compile (fileNames) {
  var files = fileNames.map(function (fileName, i) {
    return {name: fileName, sourceCode: fs.readFileSync(path.join('helpContracts', fileName), 'utf8')}
  });
  var compiledCode = compiler.compileStandardWrapper(compilerInput(files));
  var parsedErrors = JSON.parse(compiledCode).errors;
  /*if (parsedErrors !== undefined) {
   console.error('compilation errors:');
   console.error(JSON.stringify(parsedErrors, null, 4));
  }*/

  return {
    compiled: JSON.parse(compiledCode),
    files: files
  }
}

fs.readdir('helpContracts', function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
    var output = compile(files);
    tokenABI = output['compiled']['contracts']['DGTX.sol']['DGTX']['abi'];
    tokenBytecode = output['compiled']['contracts']['DGTX.sol']['DGTX'].evm.bytecode.object;
});







const deployToken = function (owner) {
    return new web3.eth.Contract(tokenABI).deploy({
        data: tokenBytecode
    }).send({
        from: owner,
        gas: 6721974,
        gasPrice: 20000000000
    });
}

export default deployToken;
