import { use, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BBox, getMapData, OsmFeature, uploadChangeset } from "osm-api";
import { MissingStreet } from "../types";
import { calcBBox, LINZ_LAYER } from "../util";
import { AuthGateway, AuthContext } from "../wrappers";
import pkg from "../../package.json";

type Data = Record<string, OsmFeature[]>;

type Props = {
  street: MissingStreet;
  onClose(): void;
};

const alphabetical = ([a]: [string, unknown], [b]: [string, unknown]) =>
  a.localeCompare(b);

const QuickFixModalInner: React.FC<Props> = ({ onClose, street }) => {
  const [data, setData] = useState<Data>();
  const [chosenName, setChosenName] = useState("");
  const [addNotName, setAddNotName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<number | Error>(); // changeset number or Error
  const { user } = use(AuthContext);

  useEffect(() => {
    async function f() {
      const [minLat, minLng, maxLat, maxLng] = calcBBox(street.geometry);

      // expand the bbox by 222 metres in all directions
      const bbox: BBox = [
        minLng - 0.002,
        minLat - 0.002,
        maxLng + 0.002,
        maxLat + 0.002,
      ];

      const elements = await getMapData(bbox);

      const candidates: Data = {};
      for (const el of elements) {
        if (el.type !== "node" && el.tags?.highway && el.tags.name) {
          candidates[el.tags!.name] ||= [];
          candidates[el.tags!.name].push(el);
        }
      }
      setData(candidates);
    }
    f();
  }, [street]);

  async function onSave() {
    setUploading(true);
    try {
      const newName = street.properties.name;
      const updatedWays = data![chosenName].map((el) => {
        const tags: Record<string, string> = { ...el.tags, name: newName };
        if (addNotName) {
          const existing = tags["not:name"]?.split(";") || [];
          existing.push(chosenName);
          tags["not:name"] = [...new Set(existing)].join(";");
        }
        return { ...el, tags };
      });

      const cs = await uploadChangeset(
        {
          comment: `Fix street name (${chosenName} --> ${newName})`,
          created_by: `MissingStreetsNZ v${pkg.version}`,
          source: `https://data.linz.govt.nz/layer/${LINZ_LAYER}`,
          host: window.location.origin + window.location.pathname,
        },
        { create: [], modify: updatedWays, delete: [] }
      );
      setDone(cs);
    } catch (ex) {
      console.error(ex);
      setDone(ex instanceof Error ? ex : new Error(`${ex}`));
    }
    setUploading(false);
  }

  const cancelBtn = (
    <button className="nice" type="button" onClick={onClose}>
      Cancel
    </button>
  );

  if (done) {
    return (
      <>
        <h3>Quick Rename</h3>

        {done instanceof Error ? (
          <>Failed: {done.message}</>
        ) : (
          <a
            href={`https://osm.org/changeset/${done}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Done!
          </a>
        )}

        <br />
        <form method="dialog">
          <button className="nice" type="submit" onClick={onClose}>
            Close
          </button>
        </form>
      </>
    );
  }

  if (uploading) {
    return <>Uploading changeset...</>;
  }

  if (!data) {
    return <>Loading... {cancelBtn}</>;
  }

  return (
    <>
      <h3>Quick Rename</h3>
      Hi <kbd>{user.display_name}</kbd>, select an OSM street to rename:
      <br />
      <br />
      <select
        value={chosenName}
        onChange={(e) => setChosenName(e.target.value)}
      >
        <option key="_" value="" disabled>
          Select a street
        </option>
        {Object.entries(data)
          .toSorted(alphabetical)
          .map(([name, feats]) => (
            <option key={name} value={name}>
              {name} ({feats.length})
            </option>
          ))}
      </select>
      <br />
      <br />
      <input
        type="checkbox"
        checked={addNotName}
        onChange={(e) => setAddNotName(e.target.checked)}
      />{" "}
      Add{" "}
      <kbd>
        <a href="https://wiki.osm.org/Key:not:name">not:name</a>
      </kbd>
      ?
      <br />
      <br />
      <form method="dialog">
        {cancelBtn}{" "}
        <button
          className="nice"
          type="submit"
          onClick={onSave}
          disabled={!chosenName || uploading}
        >
          Save
        </button>
      </form>
    </>
  );
};

export const QuickFixModal: React.FC<Props> = (props) =>
  createPortal(
    <dialog open>
      <AuthGateway>
        <QuickFixModalInner {...props} />
      </AuthGateway>
    </dialog>,
    document.querySelector("#inject-modal")!
  );
