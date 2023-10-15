import { Modal } from "./Modal";

export const HelpModal: React.FC<{ onClose(): void }> = ({ onClose }) => {
  return (
    <Modal onClose={onClose}>
      <ul>
        <li>
          Press <kbd>b</kbd> to switch imagery.
        </li>
        <li>
          Press <kbd>n</kbd> to show all roads in the area.
        </li>
        <li>
          Press <kbd>h</kbd> to show/hide all features.
        </li>
      </ul>
    </Modal>
  );
};
