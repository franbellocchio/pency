import React from "react";
import {Stack, Text, StackProps} from "@chakra-ui/core";

interface Props extends StackProps {
  category: string;
  image: string;
  note: string;
}

const CategoryBlock: React.FC<Props> = ({children, category, note, image, ...props}) => {
  return (
    <Stack spacing={6}>
      <Stack
        isInline
        alignItems="center"
        backgroundImage={`url(${image})`}
        backgroundPosition="center"
        backgroundSize="cover"
        borderRadius="lg"
        fontSize="xl"
        fontWeight={500}
        justifyContent={{base: "center", sm: "flex-start"}}
        maxWidth={640}
        padding={{base: 8, sm: 6}}
        spacing={1}
        textShadow="0px 0px 5px #000000,0px 0px 10px #000000,0px 0px 20px #000000,0px 0px 30px #000000"
        {...props}
      >
        <Text color="white">{category}</Text>
        {note && (
          <Text color="gray.300" fontSize={{base: "lg", sm: "xl"}}>
            {note}
          </Text>
        )}
      </Stack>
      {children}
    </Stack>
  );
};

export default CategoryBlock;
