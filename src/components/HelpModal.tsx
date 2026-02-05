import type { RegionMetadata } from "../types";
import { Modal } from "./Modal";

export const HelpModal: React.FC<{
  region: RegionMetadata;
  onClose(): void;
}> = ({ region, onClose }) => {
  return (
    <Modal onClose={onClose}>
      <ul>
        {region.code === "NZ" && (
          <li>
            Press <kbd>b</kbd> to switch imagery.
          </li>
        )}
        {region.code === "NZ" && (
          <li>
            Press <kbd>n</kbd> to show all roads in the area.
          </li>
        )}
        <li>
          Press <kbd>h</kbd> to show/hide all features.
        </li>
      </ul>
    </Modal>
  );
};
