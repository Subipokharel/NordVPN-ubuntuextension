#!/usr/bin/env gjs

const { GLib } = imports.gi;

let [ok, contents] = GLib.file_get_contents('../data/nordvpncountry.json');

if (ok) {
  log(contents);
  let map = JSON.parse(contents);
//   log(map['key']);
}

// const indexfile = require("../scripts/nordvpncountry.json");

// console.log(indexfile)

