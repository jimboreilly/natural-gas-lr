# natural-gas-lr
Model visualization of a 2 parameter (temp and base load) linear regression used to forecast daily natural gas consumption made to visualize difficulty in manually finding the ideal coefficients for even just a 2 parameter model.

Progress viewable at https://jimboreilly.github.io/natural-gas-lr/

## Build

```bash
npm install
```

Uses npm packages with the 'require' syntax so a bundling tool such as browserify is required to create the browser-compatible js file

```bash
browserify js/script.js -o js/bundle.js
```

Can be viewed in browser trivially using an simple zero-configuration http server such as the npm package "http-server"

```bash
npm install -g http-server
http-server
```



## References

S. Vitullo, R. H. Brown, G. F. Corliss, and B. M. Marx, “Mathematical Models for Natural Gas Forecasting,” Canadian Applied Mathematics Quarterly, vol. 17, no. 4, pp. 807–827, 2009.

https://epublications.marquette.edu/electric_fac/285/
