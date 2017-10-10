"use strict";

const HappyPack = require('../config/happypack');

module.exports = function (options, webpackConfig) {
    const isProductionMode = options.env === 'production';

    let outputImageName = webpackConfig.output.fontDir + '/[name]' + (isProductionMode ? '-[hash]' : '') + '.[ext]';

    webpackConfig.plugins.push(HappyPack.create({
        id: 'font0',
        loaders: [{
            loader: 'file-loader',
            options: {
                limit: -1, name: outputImageName
            }
        }]
    }));
    webpackConfig.module.rules.push({
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        use: ['happypack/loader?id=font0']
    });

    return webpackConfig;
};
