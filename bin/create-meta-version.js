var child_process = require('child_process')
var path = require('path')
var fs = require('fs')

const target = 'src/meta-version.js'

// git helper
const git = function (cmd, cb) {
  var stdout = child_process.execSync('git ' + cmd, { cwd: __dirname })
  return stdout.toString().trim()
}

// read package.json
const package = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))

const versionInfo = {
  version: package.version,
  git: {
    //tag: git('describe --always --tag --abbrev=0'),
    short: git('rev-parse --short HEAD'),
    long: git('rev-parse HEAD'),
    branch: git('rev-parse --abbrev-ref HEAD')
  }
}

// convert to JSON
const json = JSON.stringify(versionInfo,null,2)

// write file
console.log('writing '+target)
fs.writeFileSync(target,'export default '+json)
