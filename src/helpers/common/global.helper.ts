class GlobalHelper {
    public async setGraphData(graphData: any) {
        try {
            // console.log("Entered into setGraphData")
            if (graphData.length > 0) {

                if (graphData.length > 280) {
                    graphData = graphData.splice(-280);
                    // const cleanedData = graphData.filter((item: any) => item !== null);
                    return { status: true, graphData: graphData };
                } else {
                    // const cleanedData = graphData.filter((item: any) => item !== null);
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