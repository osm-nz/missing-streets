# Finds NZ streets that are missing in OpenStreetMap

![build](https://github.com/osm-nz/missing-streets/workflows/build/badge.svg)
![](https://github.com/osm-nz/missing-streets/workflows/Request%20LINZ%20Export/badge.svg)
![](https://github.com/osm-nz/missing-streets/workflows/Weekly%20Sync/badge.svg)

Please see [the wiki page](https://wiki.osm.org/New_Zealand/Missing_Streets) for information about this project.

If all three status badges above are green, then the script is automatically running once a week (on Wednesday morning NZ time)

<details>
<summary>Documentation for software developers (click to expand)</summary>

Running the script:

```sh
# first install nodejs and yarn

# Then generate an API from https://data.linz.govt.nz/my/api
# with "Full access to Exports Access"
# create a file called `.env.local` in this folder, and add
# REACT_APP_LDS_KEY=XXXXX
# where XXXXX is the token you just generated.

yarn 0 # this will request an export of the dataset from LINZ

# now wait up to 1 hour for the export to be generated.
# Login to https://data.linz.govt.nz to check progress

yarn 0.5 # Downloads the LINZ export
yarn 1
yarn 2
yarn 3 # generates the final file: ./public/conflationResult.geo.json

# finally, the results should be uploaded to the CDN. This is done by the GitHub CI
```

Running the client:

```sh
# first, run the script above
yarn client:start

# then visit http://127.0.0.1:3000
# you must use 127.0.0.1 instead of localhost
```

The client is automatically deployed to github pages.

</details>
