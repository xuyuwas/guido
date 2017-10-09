"use strict";

const HappyPack = require('happypack');
let happyThreadPool = HappyPack.ThreadPool({ size: 5 });

module.exports = function (options, webpackConfig) {
    const isProductionMode = options.env === 'production';

    let outputImageName = webpackConfig.output.fontDir + '/[name]' + (isProductionMode ? '-[hash]' : '') + '.[ext]';

    webpackConfig.plugins.push(new HappyPack({
        id: 'font0',
        loaders: [{
            loader: 'file-loader',
            query: {
                limit: -1, name: outputImageName
            }
        }],
        threadPool: happyThreadPool
    }));
    webpackConfig.module.rules.push({
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        use: ['happypack/loader?id=font0']
    });

    return webpackConfig;
};
