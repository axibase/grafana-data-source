import TemplateSrv from './lib/template_srv_stub';

import AtsdDatasource from '../src/datasource';
import {expect} from './lib/common';

describe('AtsdDatasource', () => {
  const templateSrv = new TemplateSrv();
  describe('datasource creation', () => {
    it('datasource should initialize without errors', () => {
      const ds = new AtsdDatasource({url: ''}, {}, templateSrv, {});
      expect(ds).toBeDefined();
    });
  });
});
