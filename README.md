# Finds streets that are missing in OpenStreetMap

![build](https://github.com/osm-nz/missing-streets/workflows/ci/badge.svg)
![](https://github.com/osm-nz/missing-streets/workflows/Request%20Export/badge.svg)
![](https://github.com/osm-nz/missing-streets/workflows/Weekly%20Sync/badge.svg)
![Lines of code](https://sloc.xyz/github/osm-nz/missing-streets)

Please see [the wiki page](https://wiki.osm.org/New_Zealand/Missing_Streets) for information about this project.
Or [click here](https://osm-nz.github.io/missing-streets) to open the tool.

If all three status badges above are green, then the script is automatically running once a week (on Wednesday morning NZ time)

<img src="https://wiki.openstreetmap.org/w/images/0/07/NZ_missing_streets.png" width="300" />

<details>
<summary>Documentation for software developers (click to expand)</summary>

Running the script:

```sh
# first install nodejs and yarn

# For some regions, you don't need any API keys.
# For other networks like NZ, you will need to:
# Then generate an API from https://data.linz.govt.nz/my/api
# with "Full access to Exports Access"
# create a file called `.env.local` in this folder, and add
# REACT_APP_LDS_KEY=XXXXX
# where XXXXX is the token you just generated.

npm start NZ preprocess # this will request an export of the dataset from LINZ

# now wait up to 1 hour for the export to be generated.
# Login to https://data.linz.govt.nz to check progress

npm start NZ downloadPlanet
npm start NZ downloadSourceData
npm start NZ preprocessPlanet
npm start NZ preprocessSourceData
npm start NZ conflate
# generates the final file: ./public/conflationResult.geo.json

# finally, the results should be uploaded to the CDN. This is done by the GitHub CI


# to run the process for other regions, just replace "NZ"
# with the region ID like "AU_NSW"
```

Running the client:

```sh
# first, run the script above
yarn client:start

# then visit http://127.0.0.1:3000
# you must use 127.0.0.1 instead of localhost
```

The client is automatically deployed to github pages.

## Other Regions

This tool supports many different regions.
You can add your local area by:

- adding a new folder in [script/regions](./script/regions/) which exports an object conforming to the standard structure.
- Implementing the code for downloading and preprocessing your region's dataset
- Adding other fields like the URL to download an extract of the planet file for your region.
- Exporting that folder from [script/regions/index.ts](./script/regions/index.ts) and choose a region ID.
- Adding the same region ID to the matrix in [.github/workflows/sync.yml](./.github/workflows/sync.yml).

</details>
