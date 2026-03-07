import { exec } from 'child_process';
import fs from 'fs';

const execWithPromise = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                reject(error);
            } else if (stderr) {
                console.error(`Command stderr: ${stderr}`);
                resolve(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

const compileProto = async () => {
    await execWithPromise('pbjs -t static-module -w es6 -o src/proto.js --force-bigint --null-semantics --no-verify --no-delimited --no-service ./proto/core.proto');
    await execWithPromise('pbts -o src/proto.d.ts src/proto.js');

    // TODO: Investigate why this is needed
    let content = fs.readFileSync('src/proto.js', 'utf8');
    content = content.replace(
        'import * as $protobuf from "@tanglechat/protobufjs/minimal";',
        'import $protobuf from "@tanglechat/protobufjs/minimal.js";'
    );
    fs.writeFileSync('src/proto.js', content);

    console.log('Proto files compiled successfully');
};
compileProto()