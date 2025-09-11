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
    // Filtrar portfolios que tengan al menos uno de los fondos globalCash o globalCashPEN
    return funds.some(
      (fund: any) => fund?.id === "globalCash" || fund?.id === "globalCashPEN"
    );
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
          // Si el fondo no es globalCash o globalCashPEN, devolverlo sin procesar
          if (
            portfolioFund?.id !== "globalCash" &&
            portfolioFund?.id !== "globalCashPEN"
          ) {
            return portfolioFund;
          }

          if (portfolioFund?.creationDate) {
            return portfolioFund;
          }

          // SERIES_O === NO_SERIES - considerar equivalencia para transacciones antiguas
          const fundTransactions = allTransactions.filter(({ fund }) => {
            if (!fund) return false;

            if (fund?.id !== portfolioFund?.id) return false;

            // Si el portfolio tiene NO_SERIES, buscar tanto NO_SERIES como SERIES_O
            if (portfolioFund?.series === "NO_SERIES") {
              return (
                fund?.series === "NO_SERIES" || fund?.series === "SERIES_O"
              );
            }

            // Si el portfolio tiene SERIES_O, buscar tanto SERIES_O como NO_SERIES
            if (portfolioFund?.series === "SERIES_O") {
              return (
                fund?.series === "SERIES_O" || fund?.series === "NO_SERIES"
              );
            }

            // Para otras series, buscar exactamente la misma
            return fund?.series === portfolioFund?.series;
          });

          console.log(
            INFO,
            `Found ${fundTransactions.length} transactions with fund ${portfolioFund?.id} and series ${portfolioFund?.series}`
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
              `No priceDate found for fund ${portfolioFund?.id} and series ${portfolioFund?.series}`
            );
            return portfolioFund;
          }

          console.log(
            INFO,
            `found priceDate ${new Date(
              transactionForCreationDate?.priceDate
            ).toISOString()} for fund ${portfolioFund?.id} and series ${
              portfolioFund?.series
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
        console.log(DONE, `Updated portfolio ${currentPortfolio?.id}`);
      } else {
        /* console.log(
          WARN,
          `Portfolio ${currentPortfolio?.id} does not need update`
        ); */
      }
    })
  );
  console.log(INFO, `Updated  ${count} portfolios`);
};

main();
