export const HelpModal: React.FC<{ onClose(): void }> = ({ onClose }) => {
  return (
    <dialog open>
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
      <form method="dialog">
        <button className="nice" type="submit" onClick={onClose}>
          Close
        </button>
      </form>
    </dialog>
  );
};
