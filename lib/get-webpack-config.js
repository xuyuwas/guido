/**
 * 输出webpack配置
 * @param options
 * @returns {*}
 */
"use strict";

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const chalk = require('chalk');
const extend = require('extend');

function fileExists(path) {
    return fs.existsSync(path);
}

function isType(s, typeString) {
    return {}.toString.call(s) === `[object ${typeString}]`;
}
function isObject(s) {
    return isType(s, 'Object');
}
function isArray(s) {
    return Array.isArray(s);
}
function isUndefined(s) {
    return isType(s, 'Undefined');
}
function isNull(s) {
    return isType(s, 'Null');
}

const generateHtmlEntry = require('./config/html');

module.exports = function (options) {
    function printLog (msg) {
        options.quiet || (console.log(msg));
    }

    // 项目webpack配置
    const userWebpackConfigPath = path.join(options.cwd, 'webpack.config.js');
    const userWebpackConfig = fileExists(userWebpackConfigPath) ? require(userWebpackConfigPath) : {};

    // 系统默认webpack配置
    const webpackConfigDefault = require(path.join(__dirname, 'webpack.config.default.js'))(options);

    // 备份一些不extend的配置,plugins不被extend防止破坏原型链
    let backupNotExtendConfig = null;
    let backupNotExtendConfigKeys = ['plugins', 'imagemin', 'html', 'browserslist', 'svg2font'];
    for (let i = 0, len = backupNotExtendConfigKeys.length; i < len; i++) {
        let keyName = backupNotExtendConfigKeys[i];
        if (!isUndefined(userWebpackConfig[keyName])) {
            if (isNull(backupNotExtendConfig)) {
                backupNotExtendConfig = {};
            }

            backupNotExtendConfig[keyName] = userWebpackConfig[keyName];
            delete userWebpackConfig[keyName];
        }
    }

    // let userWebpackConfigPlugins = [];
    // if (userWebpackConfig.plugins) {
    //     userWebpackConfigPlugins = userWebpackConfig.plugins;
    //     delete userWebpackConfig.plugins;
    // }


    // mixin config
    let webpackConfig = {};
    extend(true, webpackConfig, webpackConfigDefault, userWebpackConfig);

    // === 插件配置
    webpackConfig.plugins || (webpackConfig.plugins = []);

    // 补回一些不extend的配置
    if (isObject(backupNotExtendConfig)) {
        for (let key in backupNotExtendConfig) {
            if (backupNotExtendConfig.hasOwnProperty(key)) {
                webpackConfig[key] = backupNotExtendConfig[key];
                delete backupNotExtendConfig[key];
            }
        }
        backupNotExtendConfig = null;
    }

    // === 强制配置
    webpackConfig.output.path = path.resolve(webpackConfig.context, webpackConfig.output.path);
    if (/\/$/.test(webpackConfig.output.path) === false) {
        webpackConfig.output.path += '/';
    }

    // === 强制配置本地服务器
    if (options.devServer && isObject(webpackConfig.devServer) === false) {
         webpackConfig.devServer = {};
    }
    // 开启了热替换，检查是否for react的
    if (webpackConfig.devServer && webpackConfig.devServer.hot) {
        let entryArr;
        if (isObject(webpackConfig.entry)) {
            entryArr = Object.keys(webpackConfig.entry).map(function(k) {
                return webpackConfig.entry[k];
            });
        } else if (isArray(webpackConfig.entry) === false) {
            entryArr = [webpackConfig.entry];
        }

        webpackConfig.devServer.hot = (entryArr.join(',') + ',').indexOf('jsx,') > -1 ? 2 : 1;
    }

    // === 插件配置
    // 插件不做extend, 否则会影响到原型链
    // webpackConfig.plugins || (webpackConfig.plugins = []);
    // if (isArray(userWebpackConfigPlugins) && userWebpackConfigPlugins.length) {
    //     webpackConfig.plugins = webpackConfig.plugins.concat(userWebpackConfigPlugins);
    // }

    // === 环境输出
    if (webpackConfig.devtool === undefined) {
        switch (options.env) {
            case 'production':
                webpackConfig.devtool = 'cheap-module-source-map';
                webpackConfig.output.pathinfo = false;
                break;
            case 'development':
                webpackConfig.devtool = 'cheap-module-eval-source-map';
                webpackConfig.output.pathinfo = true;
                break;
        }
    }

    // === svg2font
    if (!webpackConfig.svg2font) {
        webpackConfig.svg2font = {
            outputPath: options.tmpCacheDir,
            formats: ['svg', 'ttf', 'eot', 'woff', 'woff2'],
            autohint: false,
            normalize: true
        };
    }
    webpackConfig.svg2font.timestamp = 1;

    // === 浏览器兼容
    if (!webpackConfig.browserslist) {
        webpackConfig.browserslist = [
            'Chrome >= 45', 'last 2 Firefox versions',
            'ie >= 9', 'Edge >= 12',
            'iOS >= 9', 'Android >= 4', 'last 2 ChromeAndroid versions'
        ];
    }

    if (!userWebpackConfig.override) { // 混合配置
        // === 配置别名
        // 在项目中可缩减引用路径
        isObject(webpackConfig.resolve) || (webpackConfig.resolve = {});
        isObject(webpackConfig.resolve.alias) || (webpackConfig.resolve.alias = {});

        webpackConfig.resolve.alias['root'] = webpackConfig.context;

        // === loader注入
        webpackConfig = require(path.join(__dirname, 'deploy/script'))(options, webpackConfig);
        webpackConfig = require(path.join(__dirname, 'deploy/style'))(options, webpackConfig);
        webpackConfig = require(path.join(__dirname, 'deploy/image'))(options, webpackConfig);
        webpackConfig = require(path.join(__dirname, 'deploy/font'))(options, webpackConfig);
        webpackConfig = require(path.join(__dirname, 'deploy/handlebars'))(options, webpackConfig);

        // 用户package和webpack配置
        const pkgPath = path.join(options.cwd, 'package.json');

        // 文件头banner设置
        const pkg = fileExists(pkgPath) ? require(pkgPath) : {};
        if (pkg.name && pkg.version) {
            webpackConfig.plugins.push(new webpack.BannerPlugin({
                banner: pkg.name + ' v' + pkg.version
            }));
        }

        if (options.devServer && webpackConfig.devServer) {
            webpackConfig = require(path.join(__dirname, 'deploy/dev-server'))(options, webpackConfig);
            let devSeverClientUrl = `http://${webpackConfig.devServer.host}:${webpackConfig.devServer.port}/`;

            // 入口文件追加server配置
            Object.getOwnPropertyNames(webpackConfig.entry).map(function (name) {
                let newEntryValue = []
                    .concat(webpackConfig.entry[name])
                    .concat('webpack-dev-server/client/?' + devSeverClientUrl);

                if (webpackConfig.devServer.hot) {
                    // 为热替换（HMR）打包好运行代码
                    // only- 意味着只有成功更新运行代码才会执行热替换（HMR）
                    newEntryValue.push('webpack/hot/only-dev-server');

                    if (webpackConfig.devServer.hot === 2) {
                        // 开启react代码的模块热替换(HMR)
                        newEntryValue.push('react-hot-loader/patch');
                    }
                }
                webpackConfig.entry[name] = newEntryValue;
            });

            if (webpackConfig.devServer.hot) {
                // 开启全局的模块热替换（HMR）
                webpackConfig.plugins.unshift(new webpack.NamedModulesPlugin());
                // 当模块热替换（HMR）时在浏览器控制台输出对用户更友好的模块名字信息
                webpackConfig.plugins.unshift(new webpack.HotModuleReplacementPlugin());

                // 转换布尔值
                webpackConfig.devServer.hot = !!webpackConfig.devServer.hot;
            }

            webpackConfig.output.publicPath = webpackConfig.devServer.publicPath;
        }

        // === 生成html
        if (isUndefined(webpackConfig.html)) {
            webpackConfig.html = true;
        }
        if (webpackConfig.html !== false) {
            let htmlEntryArr = generateHtmlEntry(options, webpackConfig);
            if (htmlEntryArr.length) {
                Array.prototype.push.apply(webpackConfig.plugins, htmlEntryArr);
            }
        }

        if (options.quiet !== true) {
            webpackConfig.plugins.push(new webpack.ProgressPlugin(function (percentage, msg) {
                if (process.stdout) {
                    const stream = process.stdout;
                    if (stream.isTTY) {
                        stream.cursorTo(0);
                        if (percentage === 1) {
                            stream.write('[Guido] ' + chalk.green('Bundle build is now finished.') + '\n');
                        } else if (percentage < 0.71) {
                            stream.write('[Guido] ' + chalk.magenta(msg));
                        }
                        stream.clearLine(1);
                    }
                } else {
                    if (percentage === 1) {
                        printLog('\n[Guido] ' + chalk.green('Bundle build is now finished.'));
                    }
                }
            }));
        }
    }

    if (options.watch) {
        webpackConfig.watch = true;
    }

    delete webpackConfig.override;
    delete webpackConfig.output.templateDir;
    delete webpackConfig.output.jsDir;
    delete webpackConfig.output.cssDir;
    delete webpackConfig.output.imageDir;
    delete webpackConfig.output.fontDir;
    delete webpackConfig.browserslist;
    delete webpackConfig.svg2font;
    delete webpackConfig.html;
    delete webpackConfig.imagemin;

    return webpackConfig;
};
