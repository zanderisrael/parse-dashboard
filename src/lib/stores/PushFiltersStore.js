/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import keyMirror          from 'lib/keyMirror';
import Parse              from 'parse';
import { List, Map }      from 'immutable';
import { registerStore }  from 'lib/stores/StoreManager';

export const ActionTypes = keyMirror(['FETCH', 'CREATE', 'DESTROY', 'ABORT_FETCH']);

const LASTFETCHTIMEOUT = 60000;
// Audience state should be an Immutable Map with the following fields:
//   - lastFetch: the last time all data was fetched from the server
//   - audiences: An Immutable List of audiences
//   - showMore: Flag to show/hide button to fetch all audiences

// xhr map, key value pair of xhrKey, xhr reference

function PushFiltersStore(state, action) {
  action.app.setParseKeys();
  switch (action.type) {
    case ActionTypes.FETCH:
      debugger
      if (state && new Date() - state.get('lastFetch') < LASTFETCHTIMEOUT) { //check for stale store
        if (state.get('filters') && state.get('filters').size >= (action.min || 0)) { //check for valid audience size
          return Promise.resolve(state);
        }
      }

      debugger
      const promise = new Parse.Query('Filter').limit(action.limit).find({useMasterKey: true})

      return promise.then((result) => {
        const { results, showMore } = result;
        debugger
        return Map({ lastFetch: new Date(), filters: List(result), showMore: showMore});
      });
    case ActionTypes.CREATE:
      return Parse._request('POST', 'push_audiences', { query: action.query, name: action.name, }, { useMasterKey: true })
          .then(({ new_audience }) => {
            return state.update('filters',(filters) => {
              return filters.unshift({
                createdAt: new Date(),
                name: action.name,
                objectId: new_audience ? new_audience.objectId || -1 : -1,
                count: 0,
                query: JSON.parse(action.query),
              });
            });
          });
    case ActionTypes.DESTROY:
      return Parse._request('DELETE', `push_audiences/${action.objectId}`, {}, { useMasterKey: true })
          .then(() => {
            return state.update('filters',(filters) => {
              let index = filters.findIndex(function(audience) {
                return audience.objectId === action.objectId;
              });
              return filters.delete(index);
            });
          });
    case ActionTypes.ABORT_FETCH:
      return Promise.resolve(state);
  }
}

registerStore('PushFilters', PushFiltersStore);
