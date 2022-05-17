import {Session, serviceClients} from '@yandex-cloud/nodejs-sdk';
import {Duration} from '@yandex-cloud/nodejs-sdk/dist/generated/google/protobuf/duration';

import * as esbuild from "esbuild";
import * as fs from "fs";

const archiver = require('archiver');
import {getInput} from '@actions/core';

async function run() {
    const token = getInput('oauth_token');
    const external = getInput('external').split(";")
    const environment = getInput('external')
    console.log(environment)

    const timeout: number = parseInt(getInput('timeout')) || 3;

    if (timeout <= 0) {
        console.error(`Timeout should be positive number (not ${timeout} seconds)`)
        return
    }

    esbuild.buildSync({
        bundle: true,
        minify: true,
        platform: "node",
        external: external,

        entryPoints: ['./src/main.ts'],
        outfile: "./build/index.js",
    })

    const output = fs.createWriteStream('./build/main.zip');
    const archive = archiver('zip');

    archive.append(fs.createReadStream("./build/index.js"), {
        name: 'index.js'
    });
    archive.append(fs.createReadStream("./package.json"), {
        name: 'package.json'
    });
    await archive.finalize();
    output.close()

    const session = new Session({oauthToken: token});
    const client = session.client(serviceClients.FunctionServiceClient);

    // @ts-ignore
    await client.createVersion({
        functionId: "d4e3ias0cj75nn52701f",
        runtime: "nodejs16",
        description: "",
        entrypoint: "index.handler",
        serviceAccountId: "ajeg7mi36ar0rqu0fj51",

        content: fs.readFileSync('./build/main.zip'),
        environment: {},
        // @ts-ignore
        resources: {
            memory: 128 * 1024 * 1024
        },
        tag: ["latest"],
        namedServiceAccounts: {},
        secrets: [],
        executionTimeout: Duration.fromPartial({seconds: 3})
    })
}

run();