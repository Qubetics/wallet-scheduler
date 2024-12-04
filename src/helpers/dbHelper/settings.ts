import * as Models from '../../models/model/index';

class SettingsQueries {

    public async settings_find_one(attr: any, where_clause: any) {
        try {
            let data: any = await Models.SettingsModel.findOne({
                attributes: attr,
                where: where_clause,
                raw: true
            })
            return data;
        } catch (err: any) {
            console.error("Error in settings_find_one>>", err)
            throw err;
        }
    }
    public async settings_create(obj: any) {
        try {
            let data: any = await Models.SettingsModel.create(obj)
            return data;
        } catch (err: any) {
            console.error("Error in settings_create>>", err)
            throw err;
        }
    }

}

const settings_queries = new SettingsQueries();
export default settings_queries;
