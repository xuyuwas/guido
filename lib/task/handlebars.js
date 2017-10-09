"use strict";

const HappyPack = require('happypack');

let happyThreadPool = HappyPack.ThreadPool({ size: 5 });

module.exports = function (options, webpackConfig) {
    webpackConfig.plugins.push(new HappyPack({
        id: 'handlebars0',
        loaders: [{
            loader: 'handlebars-loader',
            query: {
                runtime: 'handlebars/runtime',
                inlineRequires: [
                    '(?:',
                    [webpackConfig.output.imageDir.replace('/', '\\/'), webpackConfig.output.cssDir.replace('/', '\\/')].join('|'),
                    ')\\/?',
                    '.*\\.', '(jpe?g|png|gif|svg)'
                ].join('')
            }
        }],
        threadPool: happyThreadPool
    }));
    webpackConfig.module.rules.push({
        test: /\.(handlebars|hbs)$/i,
        use: ['happypack/loader?id=handlebars0']
    });


    return webpackConfig;
};
