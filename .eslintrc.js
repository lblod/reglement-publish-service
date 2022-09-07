module.exports = {
  "env": {
    "es2021": true,
    "node": true
  },
  "plugins": [ "mocha" ],
  "extends": [
    "eslint:recommended",
    "plugin:mocha/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "indent": [
      "error",
      2,
      { "SwitchCase": 1}
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "semi": [
      "error",
      "always"
    ]
  }
};
