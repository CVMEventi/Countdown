declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.ico' {
  const value: string;
  export default value;
}

declare module '*.png?no-inline' {
  const value: string;
  export default value;
}

declare module '*.ico?no-inline' {
  const value: string;
  export default value;
}

declare module '*.css';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}
