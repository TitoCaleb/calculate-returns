import { getAllPortfolios } from "./repository/PortfoliosRepository";
import { getAllTransactions } from "./repository/TransactionRepository";
import { DONE, ERR, INFO, WARN } from "./utils/customLogs";

const main = async () => {
  const portfolios = await getAllPortfolios();
  // const portfolio = await getPortfolio({
  //   customerId: "692fa6df-8908-4d80-987d-8f5ff1745839",
  //   id: "e4d39597-373c-441f-9587-7f076b69474d",
  // });
  // const portfolios = [portfolio] as Portfolio[];

  console.log(INFO, `Found ${portfolios.length} portfolios`);

  const portfoliosWithFunds = portfolios.filter(({ funds }) => {
    if (
      funds.length === 2 &&
      funds[0].id === "cash" &&
      funds[1].id === "cash"
    ) {
      return false;
    }

    return true;
  });

  console.log(
    INFO,
    `Found ${portfoliosWithFunds.length} portfolios with funds`
  );

  let count = 0;

  await Promise.all(
    portfoliosWithFunds.map(async (currentPortfolio) => {
      // portfolio funds
      const allTransactions = (
        await getAllTransactions(currentPortfolio.customerId)
      ).filter(({ type, subType }) => {
        if (type === "SELL" && subType === "PARTIAL") {
          return false;
        }

        return true;
      });

      let needUpdatePortfolio = false;
      const newPortfoliosFunds = await Promise.all(
        currentPortfolio.funds.map(async (portfolioFund: any) => {
          if (portfolioFund.id === "cash") {
            return portfolioFund;
          }

          if (portfolioFund.creationDate) {
            // console.log(
            //   OK,
            //   `Portfolio fund ${portfolioFund.id} ${portfolioFund.series} already has creationDate`
            // );

            return portfolioFund;
          }

          // SERIES_O === NO_SERIES
          const fundTransactions = allTransactions.filter(
            ({ fund: { id, series } }) =>
              id === portfolioFund.id && series === portfolioFund.series
          );

          console.log(
            INFO,
            `Found ${fundTransactions.length} transactions with fund ${portfolioFund.id} and series ${portfolioFund.series}`
          );

          // ordenar transacciones por fecha desde la mas antigua a la mas reciente
          fundTransactions.sort((a, b) => a.creationDate - b.creationDate);

          // console.log({ fundTransactions: JSON.stringify(fundTransactions) });

          const transactionForCreationDate = fundTransactions.reduce(
            (acc, currentTransaction, index, arrayOriginal) => {
              if (
                currentTransaction?.type === "BUY" &&
                arrayOriginal[index - 1]?.type === "SELL" &&
                arrayOriginal[index - 1]?.subType === "TOTAL"
              ) {
                return currentTransaction;
              }

              return acc;
            },
            fundTransactions[0]
          );

          console.log({
            t: JSON.stringify(transactionForCreationDate),
          });

          if (!transactionForCreationDate?.priceDate) {
            console.log(
              ERR,
              `No priceDate found for fund ${portfolioFund.id} and series ${portfolioFund.series}`
            );
            return portfolioFund;
          }

          console.log(
            INFO,
            `found priceDate ${new Date(
              transactionForCreationDate?.priceDate
            ).toISOString()} for fund ${portfolioFund.id} and series ${
              portfolioFund.series
            }`
          );

          needUpdatePortfolio = true;
          return {
            ...portfolioFund,
            creationDate: transactionForCreationDate.priceDate,
          };
        })
      );

      const newPortfolio = {
        ...currentPortfolio,
        funds: newPortfoliosFunds,
      };

      if (needUpdatePortfolio) {
        // await updatePortfolio(newPortfolio as Portfolio);
        count++;
        console.log(DONE, `Updated portfolio ${currentPortfolio.id}`);
      } else {
        console.log(
          WARN,
          `Portfolio ${currentPortfolio.id} does not need update`
        );
      }
    })
  );
  console.log(INFO, `Updated  ${count} portfolios`);
};

main();
