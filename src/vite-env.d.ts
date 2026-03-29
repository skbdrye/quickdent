/// <reference types="vite/client" />

// Type augmentations for library compatibility
declare module 'react-hook-form' {
  export type FieldValues = Record<string, any>;
  export type FieldPath<T extends FieldValues> = string;
  export type ControllerProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = any;
}

declare module 'react-day-picker' {
  export interface CustomComponents {
    [key: string]: any;
  }
}

declare module 'recharts' {
  export namespace Tooltip {
    interface Props {
      payload?: any[];
      label?: any;
      [key: string]: any;
    }
  }
}
