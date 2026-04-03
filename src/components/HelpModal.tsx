import type { RegionMetadata } from "../types";
import { Modal } from "./Modal";

export const HelpModal: React.FC<{
  region: RegionMetadata;
  onClose(): void;
}> = ({ region, onClose }) => {
  return (
    <Modal onClose={onClose}>
      <h3>Keyboard Shortcuts</h3>
      <ul>
        <li>
          Press <kbd>b</kbd> to switch between the two most recently used
          imagery layers.
        </li>
        <li
          style={
            region.code === "NZ"
              ? {}
              : { textDecoration: "line-through", color: "grey" }
          }
        >
          Press <kbd>n</kbd> to show all roads in the area.
        </li>
        <li>
          Press <kbd>h</kbd> to show/hide all features.
        </li>
      </ul>
      <br />
      <h3>Tips</h3>
      To view the errors inside iD, click the <kbd>Export GeoJson</kbd> button.
      Then open iD’s <kbd>Map Data</kbd> panel, and click{" "}
      <kbd>Custom Map Data</kbd>. Then select the <code>.geo.json</code> file
      that you just downloaded.
    </Modal>
  );
};
