import type { RegionMetadata } from "../types";
import { Modal } from "./Modal";

export const HelpModal: React.FC<{
  region: RegionMetadata;
  onClose(): void;
}> = ({ region, onClose }) => {
  return (
    <Modal onClose={onClose}>
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
    </Modal>
  );
};
