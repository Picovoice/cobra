import fs from "fs";
import ncp from "ncp";
import { dirname, join } from "path";
import editJsonFile from "edit-json-file";
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

for (const flavour of ["factory", "worker"]) {
  console.log(`Template: ${flavour}`);

  const projectRootPath = join(__dirname, "..");
  const templateDirectory = join(projectRootPath, "template");
  const buildTarget = `cobra-web-${flavour}`;
  const outputDirectory = join(projectRootPath, buildTarget);
  ncp(templateDirectory, outputDirectory, (err) => {
    if (err) {
      console.error(err);
    } else {
      // index.ts: Rollup's entry point is different for workers/factories
      console.log(join(projectRootPath, flavour, "index.ts"));
      console.log(join(outputDirectory, "src"));
      ncp(
        join(projectRootPath, flavour, "index.ts"),
        join(outputDirectory, "src", "index.ts"),
        (err) => {
          if (err) {
            console.error(error);
          } else {
            console.log("index.ts copied");

            // Customize the package.json to have the correct names and build targets
            const packageJson = editJsonFile(
              join(outputDirectory, "package.json")
            );
            packageJson.set("name", `@picovoice/${buildTarget}`);
            packageJson.save((e) => {
              console.log(`${buildTarget} Package JSON updated`);
            });
          }
        }
      );
    }
  }
  );
}
