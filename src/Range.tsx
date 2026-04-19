import { type ComponentProps } from 'react';
import Slider from '@rc-component/slider';
import '@rc-component/slider/assets/index.css';
import './Range.css';

interface RangeProps {
  onChangeComplete?: (value: [number, number]) => void;
  disabled?: ComponentProps<typeof Slider>['disabled'];
  max?: ComponentProps<typeof Slider>['max'];
  marks?: ComponentProps<typeof Slider>['marks'];
  defaultValue?: ComponentProps<typeof Slider>['defaultValue'];
  ariaLabelForHandle?: ComponentProps<typeof Slider>['ariaLabelForHandle'];
  tooltipContent: (value: number) => React.ReactNode;
}
export default function Range({ onChangeComplete, tooltipContent, ...rest }: RangeProps) {
  return (
    <div className="range-wrapper">
      <Slider range
        onChangeComplete={value => onChangeComplete?.(value as [number, number])}
        styles={{
          track: { backgroundColor: 'var(--accent)' },
          handle: { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', opacity: 1 },
        }}
        handleRender={(node, handleProps) => {
          return (
            <div className="range-handle-wrapper" style={{ left: node.props.style?.left }}>
              <div className="range-handle-inner">
                {node}
                {handleProps.dragging && <div className="range-handle-tooltip">
                  {tooltipContent(handleProps.value)}
                </div>}
              </div>
            </div>
          );
        }}
        {...rest}
      />
    </div>
  );
}
