# Finds NZ streets that are missing in OpenStreetMap

![build](https://github.com/osm-nz/missing-streets/workflows/build/badge.svg)

Please see [the wiki page](https://wiki.osm.org/New_Zealand/Missing_Streets) for information about this project.

<details>
<summary>Documentation for software developers (click to expand)</summary>

Running the script:

```sh
# first install nodejs and yarn
# then download https://data.linz.govt.nz/layer/53382, save it as ./tmp/linz.csv
yarn 1
yarn 2
yarn 3 # generates the final file: ./public/conflationResult.geo.json
yarn 4 # uploads the file to the CDN - requires an authentication token
```

Running the client:

```sh
# first, run the script above
yarn client:start

# then visit http://127.0.0.1:3000 or http://127.0.0.1:3000/?dev (to use the local conflationResult.geo.json file)
# you must use 127.0.0.1 instead of localhost
```

The client is automatically deployed to github pages.

</details>
