// Polyfill for dynamic requires that esbuild can't handle
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import util from 'util';
import tty from 'tty';
import net from 'net';
import url from 'url';
import events from 'events';
import stream from 'stream';
import buffer from 'buffer';
import assert from 'assert';
import child_process from 'child_process';
import zlib from 'zlib';
import http from 'http';
import https from 'https';
import querystring from 'querystring';
import worker_threads from 'worker_threads';
import perf_hooks from 'perf_hooks';

const builtinModules = {
  'fs': fs,
  'path': path,
  'os': os,
  'crypto': crypto,
  'util': util,
  'tty': tty,
  'net': net,
  'url': url,
  'events': events,
  'stream': stream,
  'buffer': buffer,
  'assert': assert,
  'child_process': child_process,
  'zlib': zlib,
  'http': http,
  'https': https,
  'querystring': querystring,
  'worker_threads': worker_threads,
  'perf_hooks': perf_hooks
};

// Override the dynamic require function
globalThis.__require = function(id) {
  if (builtinModules[id]) {
    return builtinModules[id];
  }
  // For non-built-ins, try the original require
  if (typeof require !== 'undefined') {
    return require(id);
  }
  throw new Error(`Module not found: ${id}`);
};