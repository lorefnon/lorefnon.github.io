import path from "path";
import glob from "globby";
import cheerio from "cheerio";
import fs from "fs-extra";

async function main() {
    const exportDir = process.env.WP_DIR;
    if (!exportDir) throw new Error("WP_DIR must be specified");
    await Promise.all((await glob(path.join(exportDir, "**/*.html"))).map(processFile));
}

async function processFile(f: string) {
    const match = f.match(/(\d{4})\/(\d{2})\/(\d{2})\/(.*)\/index.html/);
    if (!match) return;
    const [,year,month,date,slug] = match;
    const content = await fs.readFile(f, "utf8");
    const $ = cheerio.load(content);
    const titleEl = $('title');
    const contentEl = $('.entry-content');
    const catEl = $('a[rel="category tag"]');
    if (!contentEl.length) return;
    const tgtFile = `source/_posts/${year}/${month}/${date}/${slug}.ejs`
    await fs.ensureDir(path.dirname(tgtFile));
    await fs.writeFile(tgtFile, `---
date: "${year}-${month}-${date}"
title: "${titleEl.text()}"
permalink: "${year}/${month}/${date}/${slug}/"
tags: [${catEl.map(e => $(e).text()).toArray().filter(Boolean).join(', ')}]
---
<link rel="stylesheet" href="/css/crayon.min.css" >
<link rel="stylesheet" href="/css/crayon-flatui-light.css" >

${contentEl.html()}
    `);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
})

