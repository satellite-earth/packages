import { PrivateNodeConfig } from '../private-node-config.js';

type ConfigSubscribe = ['CONTROL', 'CONFIG', 'SUBSCRIBE'];
type ConfigSetAction = ['CONTROL', 'CONFIG', 'SET', keyof PrivateNodeConfig, any];

export type ConfigResponse = ['CONTROL', 'CONFIG', 'CHANGED', PrivateNodeConfig];
export type ConfigMessage = ConfigSubscribe | ConfigSetAction;
