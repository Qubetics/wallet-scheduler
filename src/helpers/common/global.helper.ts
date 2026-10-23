class GlobalHelper {
    public async setGraphData(graphData: any) {
        try {
            if (graphData.length > 0) {

                if (graphData.length > 280) {
                    graphData = graphData.splice(-280);
                    return { status: true, graphData: graphData };
                } else {
                    return { status: true, graphData: graphData };
                }
            } else {
                return { status: false };
            }
        } catch (err: any) {
            console.error("Error in setGraphData >> ", err.message);
            return { status: false };
        }
    }

}
const globalHelper = new GlobalHelper();
export default globalHelper;