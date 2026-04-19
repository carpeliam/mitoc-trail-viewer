import { useState } from 'react';
import { useCombobox } from 'downshift';
import type { Feature, LineString, Point } from 'geojson';
import type { RouteProperties, PeakProperties } from '../types';
import './Search.css';

const SUGGESTION_LIMIT = 200;

function typeFor(item: Feature<LineString | Point>) {
  return (item.geometry.type === 'Point' ? 'Peak' : 'Route');
}

type SearchableFeature = Feature<LineString, RouteProperties> | Feature<Point, PeakProperties>;
interface SearchProps {
  features: SearchableFeature[];
  onSelect: (item: SearchableFeature | null) => void;
  className?: string;
}
export default function Search({ features, onSelect, className }: SearchProps) {
  const [items, setItems] = useState(features.slice(0, SUGGESTION_LIMIT));
  const { isOpen, getMenuProps, getInputProps, getItemProps } = useCombobox({
    items,
    onInputValueChange({ inputValue }) {
      setItems(features.filter(
        f => f.properties.name.toLowerCase().includes(inputValue.toLowerCase()),
      ).slice(0, SUGGESTION_LIMIT));
    },
    itemToString(f) { return f?.properties.name || ''; },
    onSelectedItemChange({ selectedItem }) { onSelect(selectedItem); },
  });
  return (
    <div className={className}>
      <input type="search" placeholder="Search..." {...getInputProps()} />
      <ul {...getMenuProps()} hidden={!isOpen} onWheelCapture={e => e.stopPropagation()}>
        {items.map((item, index) => (
          <li key={`${item.properties.name}-${index}`} {...getItemProps({ item, index })}>
            {item.properties.name} ({typeFor(item)})
          </li>
        ))}
      </ul>
    </div>
  );
}
