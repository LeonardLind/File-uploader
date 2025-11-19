export type OptionMap = {
  [plot: string]: {
    [experience: string]: {
      [sensor: string]: string | string[];
    };
  };
};

export const metadataMap: OptionMap = {
  "Horto Alegria": {
    "XP1 - Cavidades": {
      Sensor_ID_63: "Deployment_ID_49",
      Sensor_ID_65: "Deployment_ID_51",
      Sensor_ID_66: "Deployment_ID_52",
      Sensor_ID_67: "Deployment_ID_53",
      Sensor_ID_64: "Deployment_ID_50",
    },
    "XP2 - Intacta": {
      Sensor_ID_58: "Deployment_ID_44",
      Sensor_ID_59: "Deployment_ID_45",
      Sensor_ID_60: "Deployment_ID_46",
      Sensor_ID_61: "Deployment_ID_47",
      Sensor_ID_62: "Deployment_ID_48",
    },
    "XP3 - Germano": { Sensor_ID_72: "Deployment_ID_58" },
  },

  "Mina Aguas Claras": {
    "Mata-atlantica rehab": { Sensor_ID_0: "Deployment_ID_0" },

    "Cerrado reabilitation": {
      Sensor_ID_4: "Deployment_ID_13",
      Sensor_ID_12: "Deployment_ID_14",
      Sensor_ID_18: "Deployment_ID_9",
      Sensor_ID_23: "Deployment_ID_11",
      Sensor_ID_27: "Deployment_ID_10",
      Sensor_ID_31: "Deployment_ID_12",
    },

    "Cerrado Mature": {
      Sensor_ID_2: "Deployment_ID_25",
      Sensor_ID_13: ["Deployment_ID_26", "Deployment_ID_27"],
      Sensor_ID_21: "Deployment_ID_21",
      Sensor_ID_25: "Deployment_ID_23",
      Sensor_ID_29: ["Deployment_ID_22", "Deployment_ID_24"],
    },

    "Mata-atlantica intact": {
      Sensor_ID_3: "Deployment_ID_5",
      Sensor_ID_7: "Deployment_ID_6",
      Sensor_ID_9: "Deployment_ID_7",
      Sensor_ID_10: "Deployment_ID_8",
      Sensor_ID_17: "Deployment_ID_1",
      Sensor_ID_22: "Deployment_ID_3",
      Sensor_ID_27: "Deployment_ID_2",
      Sensor_ID_30: "Deployment_ID_4",
    },

    "Mature forest edge": {
      Sensor_ID_4: "Deployment_ID_19",
      Sensor_ID_16: "Deployment_ID_20",
      Sensor_ID_20: "Deployment_ID_15",
      Sensor_ID_24: "Deployment_ID_17",
      Sensor_ID_28: "Deployment_ID_16",
      Sensor_ID_32: "Deployment_ID_18",
    },
  },

  Gaio: {
    "XP1 - Fronteira": {
      Sensor_ID_54: "Deployment_ID_40",
      Sensor_ID_55: "Deployment_ID_41",
      Sensor_ID_56: "Deployment_ID_42",
      Sensor_ID_57: "Deployment_ID_43",
    },

    "XP2 - Transicao": {
      Sensor_ID_50: "Deployment_ID_36",
      Sensor_ID_51: "Deployment_ID_37",
      Sensor_ID_52: "Deployment_ID_38",
      Sensor_ID_53: "Deployment_ID_39",
    },

    "XP3 - Crescimento": {
      Sensor_ID_41: "Deployment_ID_32",
      Sensor_ID_42: "Deployment_ID_33",
      Sensor_ID_43: "Deployment_ID_34",
      Sensor_ID_49: "Deployment_ID_35",
    },

    "XP4 - Independente": {
      Sensor_ID_37: "Deployment_ID_28",
      Sensor_ID_38: "Deployment_ID_29",
      Sensor_ID_39: "Deployment_ID_30",
      Sensor_ID_40: "Deployment_ID_31",
    },

    "XP5 - Selvageria": {
      Sensor_ID_68: "Deployment_ID_54",
      Sensor_ID_69: "Deployment_ID_55",
      Sensor_ID_70: "Deployment_ID_56",
      Sensor_ID_71: "Deployment_ID_57",
    },
  },
};
