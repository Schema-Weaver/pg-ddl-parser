// Centralized import/export file for all relationship detectors

export { detectForeignKeys } from './fk-detector';
export { detectPartitions } from './partition-detector';
export { detectInheritance } from './inheritance-detector';
export { detectViewDependencies } from './view-dependencies';
export { detectTriggerBindings } from './trigger-bindings';
export { detectSequenceOwnership } from './sequence-ownership';
export { detectPropertyGraphRelations } from './property-graph-relations';
export { detectTemporalRelations } from './temporal-relations';
export { detectExtensionDependencies } from './extension-dependencies';
