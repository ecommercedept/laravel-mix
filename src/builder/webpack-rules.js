let webpack = require("webpack")
let ExtractTextPlugin = require("extract-text-webpack-plugin")
let Verify = require("../Verify")

module.exports = function() {
    let rules = []
    let extractPlugins = []

    // Babel Compilation.
    rules.push({
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: [
            {
                loader: "babel-loader",
                options: Config.babel(),
            },
        ],
    })

    // CSS Compilation.
    rules.push({
        test: /\.css$/,

        exclude: Config.preprocessors.postCss
            ? Config.preprocessors.postCss.map(postCss => postCss.src.path())
            : [],
        loaders: ["style-loader", "css-loader"],
    })

    // Recognize .scss Imports.
    rules.push({
        test: /\.s[ac]ss$/,
        exclude: Config.preprocessors.sass
            ? Config.preprocessors.sass.map(sass => sass.src.path())
            : [],
        loaders: ["style-loader", "css-loader", "sass-loader"],
    })

    // Add support for inline-SVGs
    rules.push({
        test: /\.svg$/,
        loader: "raw-loader",
    })

    // Here, we'll filter through all CSS preprocessors that the user has requested.
    // For each one, we'll add a new Webpack rule and then prepare the necessary
    // extract plugin to extract the CSS into its file.
    Object.keys(Config.preprocessors).forEach(type => {
        if (type === "fastSass") return

        Config.preprocessors[type].forEach(preprocessor => {
            let outputPath = preprocessor.output.filePath
                .replace(Config.publicPath + path.sep, path.sep)
                .replace(/\\/g, "/")

            tap(new ExtractTextPlugin(outputPath), extractPlugin => {
                let loaders = [
                    {
                        loader: "css-loader",
                        options: {
                            url: Config.processCssUrls,
                            sourceMap: Mix.isUsing("sourcemaps"),
                            importLoaders: 1,
                        },
                    },

                    {
                        loader: "postcss-loader",
                        options: {
                            sourceMap:
                                type === "sass" && Config.processCssUrls
                                    ? true
                                    : Mix.isUsing("sourcemaps"),
                            ident: "postcss",
                            plugins: (function() {
                                let plugins = Config.postCss

                                if (
                                    preprocessor.postCssPlugins &&
                                    preprocessor.postCssPlugins.length
                                ) {
                                    plugins = preprocessor.postCssPlugins
                                }

                                if (
                                    Config.autoprefixer &&
                                    Config.autoprefixer.enabled
                                ) {
                                    plugins.push(
                                        require("autoprefixer")(
                                            Config.autoprefixer.options
                                        )
                                    )
                                }

                                return plugins
                            })(),
                        },
                    },
                ]

                if (type === "sass" && Config.processCssUrls) {
                    loaders.push({
                        loader: "resolve-url-loader",
                        options: {
                            sourceMap: true,
                            root: Mix.paths.root("node_modules"),
                        },
                    })
                }

                if (type !== "postCss") {
                    loaders.push({
                        loader: `${type}-loader`,
                        options: Object.assign(preprocessor.pluginOptions, {
                            sourceMap:
                                type === "sass" && Config.processCssUrls
                                    ? true
                                    : Mix.isUsing("sourcemaps"),
                        }),
                    })
                }

                rules.push({
                    test: preprocessor.src.path(),
                    use: extractPlugin.extract({
                        fallback: "style-loader",
                        use: loaders,
                    }),
                })

                extractPlugins.push(extractPlugin)
            })
        })
    })

    return { rules, extractPlugins }
}
