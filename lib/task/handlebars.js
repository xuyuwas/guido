"use strict";

const HappyPack = require('../config/happypack');

module.exports = function (options, webpackConfig) {
    webpackConfig.plugins.push(HappyPack.create({
        id: 'handlebars0',
        loaders: [{
            loader: 'handlebars-loader',
            options: {
                runtime: 'handlebars/runtime',
                inlineRequires: [
                    '(?:',
                    [webpackConfig.output.imageDir.replace('/', '\\/'), webpackConfig.output.cssDir.replace('/', '\\/')].join('|'),
                    ')\\/?',
                    '.*\\.', '(jpe?g|png|gif|svg)'
                ].join('')
            }
        }]
    }));
    webpackConfig.module.rules.push({
        test: /\.(handlebars|hbs)$/i,
        use: ['happypack/loader?id=handlebars0']
    });


    return webpackConfig;
};
