const { Router } = require("express");
const router = Router();
const axios = require("axios");
const registry = require("./registry.json");
const fs = require("fs");
const loadbalancer = require("../util/loadbalancer");

router.all("/:apiName/:path", (req, res) => {
  const { apiName, path } = req.params;
  const service = registry.services[apiName];

  if (service) {
    if (!service.loadBalancerStrategy) {
      service.loadBalancerStrategy = "ROUND_ROBIN";
      fs.writeFile(
        "./routes/registry.json",
        JSON.stringify(registry),
        (error) => {
          if (error) {
            res.send("Couldn't write load balance strategy");
          }
        }
      );
    }

    const newIndex = loadbalancer[service.loadBalancerStrategy](service);
    const url = service.instances[newIndex].url;

    axios({
      method: req.method,
      url: `${url}${path}`,
      headers: req.headers,
      data: req.body,
    })
      .then((response) => {
        res.send(response.data);
      })
      .catch(() => res.send(""));
  } else {
    res.send("Api name doesn't exist");
  }
});

router.post("/register", (req, res) => {
  const registrationInfo = req.body;
  registrationInfo.url = `${registrationInfo.protocol}://${registrationInfo.host}:${registrationInfo.port}/`;

  if (apiAlreadyExists(registrationInfo)) {
    res.send(
      `Configuration already exists for '${registrationInfo.apiName}' at '${registrationInfo.url}'`
    );
  } else {
    registry.services[registrationInfo.apiName].instances.push({
      ...registrationInfo,
    });

    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(`Could not register '${registrationInfo.apiName}'`);
        } else {
          res.send(`Successfully registered '${registrationInfo.apiName}'`);
        }
      }
    );
  }
});

const apiAlreadyExists = (registrationInfo) => {
  let exists = false;

  registry.services[registrationInfo.apiName].instances.forEach((instance) => {
    if (instance.url === registrationInfo.url) {
      exists = true;
      return;
    }
  });

  return exists;
};

router.post("/unregister", (req, res) => {
  const registrationInfo = req.body;

  if (apiAlreadyExists(registrationInfo)) {
    const index = registry.services[
      registrationInfo.apiName
    ].instances.findIndex((instance) => {
      return registrationInfo.url === instance.url;
    });

    registry.services[registrationInfo.apiName].instances.splice(index, 1);

    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(`Could not unregister '${registrationInfo.apiName}'`);
        } else {
          res.send(`Successfully unregistered '${registrationInfo.apiName}'`);
        }
      }
    );
  } else {
    res.send(
      `Configuration does not exists for '${registrationInfo.apiName}' at '${registrationInfo.url}'`
    );
  }
});

module.exports = router;
