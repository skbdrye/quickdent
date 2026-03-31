/// <reference types="vite/client" />
/// <reference types="tailwindcss/tailwind" />

// Comprehensive type augmentations for library compatibility
declare module 'react-hook-form' {
  export type FieldValues = Record<string, any>;
  export type FieldPath<T extends FieldValues = FieldValues> = keyof T & string;
  export interface ControllerProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > {
    name: TName;
    control?: any;
    render?: any;
    defaultValue?: any;
    rules?: any;
  }
  export { Controller, FormProvider, useFormContext };
}

declare module 'react-day-picker' {
  export const DayPicker: React.ComponentType<any>;
  export interface CustomComponents {
    IconLeft?: React.ComponentType<any>;
    IconRight?: React.ComponentType<any>;
    [key: string]: any;
  }
}

declare module 'recharts' {
  export const ResponsiveContainer: React.ComponentType<any>;
  export const Tooltip: React.ComponentType<any>;
  export const Legend: React.ComponentType<any>;
  
  namespace Tooltip {
    interface Props {
      payload?: any[];
      label?: any;
      active?: boolean;
      [key: string]: any;
    }
  }
  
  namespace Legend {
    interface Props {
      payload?: Array<{
        dataKey?: string | number;
        type?: string;
        color?: string;
        value?: any;
        [key: string]: any;
      }>;
      verticalAlign?: 'top' | 'middle' | 'bottom';
      [key: string]: any;
    }
  }
  
  export interface LegendProps {
    payload?: any[];
    verticalAlign?: 'top' | 'middle' | 'bottom';
    [key: string]: any;
  }
}

declare module '@/components/user/UserAppointments' {
  export interface UserAppointmentsProps {
    highlightAppointmentId?: number | null;
    highlightKey?: number;
  }
  export function UserAppointments(props: UserAppointmentsProps): JSX.Element;
}

declare module '@/components/ui/badge' {
  import React from 'react';
  export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'noshow' | 'banned' | 'warning';
  }
  export const Badge: React.ForwardRefExoticComponent<BadgeProps & React.RefAttributes<HTMLDivElement>>;
  export const badgeVariants: any;
}
