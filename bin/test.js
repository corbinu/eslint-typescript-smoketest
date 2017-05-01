require('shelljs/global');

const src = `${__dirname}/../src`;

const type = process.argv[2] || "vscode";

fs.remove(src, function (err) {
  if (err) return console.error(err)

  copy(`${projects}/**/*.ts`, src, function(err, files) {
    if (err) return console.log(err);

    copy(`${projects}/**/*.d.ts`, src, function(err, files) {

      copy(`${configs}/${type}/**/.eslintrc.*`, src, function(err, files) {
        if (err) return console.log(err);
      });
    });
  });
});
