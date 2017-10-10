"use strict";

const path = require('path');
const fs = require('fs');
const ParallelUglifyPlugin = require('webpack-parallel-uglify-plugin');
const HappyPack = require('../config/happypack');

function isUndefined(s) {
    return {}.toString.call(s) === `[object Undefined]`;
}

module.exports = function (options, webpackConfig) {
    const REG_SCRIPT_FILE = /\.(js|jsx)$/i;

    if (isUndefined(webpackConfig.output.filename)) {
        webpackConfig.output.filename = options.env === 'production' ? '[name]-[chunkhash].js' : '[name].js';
    }
    webpackConfig.output.filename = path.join(webpackConfig.output.jsDir, webpackConfig.output.filename);

    if (isUndefined(webpackConfig.output.chunkFilename)) {
        webpackConfig.output.chunkFilename = options.env === 'production' ? '[name]-chunk-[chunkhash].js' : '[name]-chunk.js';
    }
    webpackConfig.output.chunkFilename = path.join(webpackConfig.output.jsDir, webpackConfig.output.chunkFilename);

    const REG_EXCLUDE = /node_modules/i;

    webpackConfig.plugins.push(HappyPack.create({
        id: 'script0',
        loaders: [{
            loader: require.resolve('babel-loader'),
            options: require(path.join(__dirname, '../config/babel'))(webpackConfig)
        }]
    }));
    webpackConfig.module.rules.push({
        test: REG_SCRIPT_FILE,
        exclude: REG_EXCLUDE,
        use: ['happypack/loader?id=script0']
    });

    if (fs.existsSync(path.join(webpackConfig.context, '.eslintrc'))) {
        webpackConfig.plugins.push(HappyPack.create({
            id: 'script1',
            loaders: [{
                loader: require.resolve('eslint-loader'),
                options: require(path.join(__dirname, '../config/eslint'))(webpackConfig)
            }]
        }));
        webpackConfig.module.rules.unshift({
            test: REG_SCRIPT_FILE,
            exclude: REG_EXCLUDE,
            enforce: 'pre',
            use: ['happypack/loader?id=script1']
        });
    }

    if (options.env === 'production') {
        webpackConfig.plugins.push(new ParallelUglifyPlugin({
            uglifyJS: {
                // https://www.npmjs.com/package/uglify-js#output-options
                output: {
                    ascii_only: true,
                    beautify: false, // 最紧凑的输出
                    comments: false, // 删除所有的注释
                },

                // https://www.npmjs.com/package/uglify-js#compress-options
                compress: {
                    warnings: false, // 在UglifyJs删除没有用到的代码时不输出警告
                    drop_console: true, // 删除所有的 `console` 语句, 还可以兼容ie浏览器
                    drop_debugger: true, // 移除 `debugger;` 声明
                    collapse_vars: true, // 内嵌定义了但是只用到一次的变量
                    reduce_vars: true // 提取出出现多次但是没有定义成变量去引用的静态值
                }
            }
        }));
    }

    return webpackConfig;
};
