/**
 * ==========================================
 *        AuraDash State Routes
 * ==========================================
 * 
 * Defines the routing endpoints for State operations.
 */

import { Hono } from 'hono';
import { StateController } from '../controllers/state.controller';
import { AppContext } from '../types';

const stateRoutes = new Hono<AppContext>();

/**
 * GET /api/state/hash
 * Retrieves the state version hash.
 */
stateRoutes.get('/hash', StateController.getHash);

/**
 * GET /api/state/counters
 * Retrieves dashboard counters.
 */
stateRoutes.get('/counters', StateController.getCounters);

export default stateRoutes;
