import React from "react";
import {Grid, Stack, StackProps} from "@chakra-ui/core";

interface Props extends StackProps {
  layout: "landscape" | "portrait";
}

const ProductsGrid: React.FC<Props> = ({children, layout, ...props}) => (
  <Stack spacing={{base: 4, sm: 5}} {...props}>
    {layout === "landscape" && (
      <Grid
        autoRows="auto"
        gridGap={{base: 0, sm: 8}}
        templateColumns={{
          base: "repeat(auto-fill, minmax(200px,1fr))",
          sm: "repeat(auto-fill, minmax(400px,1fr))",
        }}
      >
        {children}
      </Grid>
    )}
    {layout === "portrait" && (
      <Grid
        autoRows="auto"
        gridGap={{base: 4, sm: 8}}
        templateColumns={{
          base: "repeat(auto-fill, minmax(140px,1fr))",
          sm: "repeat(auto-fill, minmax(200px,1fr))",
        }}
      >
        {children}
      </Grid>
    )}
  </Stack>
);

export default ProductsGrid;
