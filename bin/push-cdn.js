'use strict';

var exec = require('child_process').exec;
var semver = require('semver')

// requires env with AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
var push = function(name,version,maxAge) {
  console.log('> Pushing version '+version)

  // --cache-control
  var cmdline = "AWS_DEFAULT_REGION=eu-central-1 aws s3 cp --exclude=\"*\" --include=\"*.js\" --recursive dist/ s3://solutions-cdn.six.se/js/"+name+"/"+version+"/ --cache-control max-age="+maxAge+" --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers"
  exec(cmdline, (err, stdout, stderr) => {
    if (err) {
      console.error(err)
      return
    }
    console.log(stdout)
  })
}

var packageName = process.env.npm_package_name
var packageVersion = process.env.npm_package_version

if(process.env.PUSH_CDN === "true"){
    console.log('Pushing "'+packageName+'" version '+packageVersion+' to S3')
    push(packageName,packageVersion,86400)
    push(packageName,semver.major(packageVersion)+'.'+semver.minor(packageVersion),3600)
    push(packageName,semver.major(packageVersion),3600)
}
else {
    console.log('PUSH_CDN is not set to "true" will do nothing. To fix: export PUSH_CDN=true')
}
