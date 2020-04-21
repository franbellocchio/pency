import {VariantColor} from "@chakra-ui/core";

export interface Tenant {
  id: string;
  slug: string;
  logo?: string;
  color: Exclude<VariantColor, "black" | "white">;
  message: string;
  phone: number;
  hue: number;
}

export interface State {
  tenant: Tenant;
}

export interface Actions {
  update: (tenant: Tenant) => void;
}

export interface Context {
  state: State;
  actions: Actions;
}
