const loadbalancer = {};

loadbalancer.ROUND_ROBIN = (service) => {
  const newIndex =
    ++service.index >= service.instances.length ? 0 : service.index;
  service.index = newIndex;

  return newIndex;
};

module.exports = loadbalancer;
