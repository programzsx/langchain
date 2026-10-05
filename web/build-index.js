#!/usr/bin/env node
/*
 * build-index.js — 扫描 monorepo 各包的 pyproject.toml，生成包信息索引
 * 输出 web/data/index.json：{ generatedAt, total, packages: [{ name, version, description, dir, group }] }
 * 页面运行时 fetch 该索引渲染 Arco Pro 包管理后台。
 * 用法：node web/build-index.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'data', 'index.json');

/* 包分组：目录 → 分组名 */
const GROUPS = {
  'libs/core': '核心包',
  'libs/langchain': '主包（classic）',
  'libs/langchain_v1': '主包（v1）',
  'libs/model-profiles': '工具包',
  'libs/standard-tests': '测试包',
  'libs/text-splitters': '文本处理',
  'libs/partners': '合作方集成',
};

/* 从 pyproject.toml 提取字段的简易解析（只取 [project] 段的 name/version/description） */
function parseProjectMeta(content) {
  const meta = {};
  let inProject = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('[')) {
      inProject = line === '[project]';
      continue;
    }
    if (!inProject) continue;
    let m = line.match(/^name\s*=\s*"([^"]+)"/);
    if (m) meta.name = m[1];
    m = line.match(/^version\s*=\s*"([^"]+)"/);
    if (m) meta.version = m[1];
    m = line.match(/^description\s*=\s*"([^"]+)"/);
    if (m) meta.description = m[1];
  }
  return meta;
}

const packages = [];
for (const [dir, group] of Object.entries(GROUPS)) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  if (dir === 'libs/partners') {
    /* 合作方集成：每个子目录一个包 */
    for (const sub of fs.readdirSync(full).sort()) {
      const pyproject = path.join(full, sub, 'pyproject.toml');
      if (!fs.existsSync(pyproject)) continue;
      const meta = parseProjectMeta(fs.readFileSync(pyproject, 'utf8'));
      if (!meta.name) continue;
      packages.push({ ...meta, dir: 'libs/partners/' + sub, group });
    }
  } else {
    const pyproject = path.join(full, 'pyproject.toml');
    if (!fs.existsSync(pyproject)) continue;
    const meta = parseProjectMeta(fs.readFileSync(pyproject, 'utf8'));
    if (!meta.name) continue;
    packages.push({ ...meta, dir, group });
  }
}

const index = {
  generatedAt: new Date().toISOString(),
  total: packages.length,
  packages,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index, null, 2));

console.log('已生成 ' + path.relative(ROOT, OUT) + '：' + packages.length + ' 个包');
