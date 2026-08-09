import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

const plugins = [
  nodeResolve({
    browser: true,
    preferBuiltins: false,
  }),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: false,
  }),
  babel({
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
    presets: [['@babel/preset-env', { targets: { esmodules: true } }]],
  }),
  terser({
    ecma: 2022,
    module: true,
    compress: {
      passes: 2,
      drop_console: true,
      drop_debugger: true,
    },
    mangle: {
      properties: false,
    },
    format: {
      comments: false,
    },
  }),
];

export default [
  {
    input: 'src/platinum-weather-card.ts',
    output: {
      dir: 'dist',
      format: 'es',
    },
    plugins: [...plugins],
  },
];
